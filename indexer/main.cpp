#include "clang/AST/RecursiveASTVisitor.h"
#include "clang/Frontend/CompilerInstance.h"
#include "clang/Frontend/FrontendActions.h"
#if __has_include("clang/UnifiedSymbolResolution/USRGeneration.h")
#include "clang/UnifiedSymbolResolution/USRGeneration.h"
#else
#include "clang/Index/USRGeneration.h"
#endif
#include "clang/Tooling/CommonOptionsParser.h"
#include "clang/Tooling/Tooling.h"
#include "clang/Basic/Version.h"
#include "llvm/Support/JSON.h"
#include "llvm/Support/Path.h"
#include "llvm/Support/FileSystem.h"
#include "llvm/Support/raw_ostream.h"
#include <set>
using namespace clang;
using namespace clang::tooling;
static llvm::cl::OptionCategory Category("Kernel Source Explorer");
static llvm::cl::opt<std::string> Root("root", llvm::cl::Required, llvm::cl::cat(Category));
static llvm::json::Array Symbols, Locations, Edges, Diagnostics;
static std::set<std::string> Seen;
static std::string TU, RootPath;
static unsigned Errors = 0;
static std::string canonical(llvm::StringRef p) {
  llvm::SmallString<256> out;
  if (!llvm::sys::fs::real_path(p, out)) return std::string(out);
  return p.str();
}
class Visitor : public RecursiveASTVisitor<Visitor> {
  ASTContext &Ctx;
  SourceManager &SM;
  std::string Owner;
  llvm::json::Object point(SourceLocation loc) {
    if (loc.isInvalid()) return {};
    return llvm::json::Object{{"file", canonical(SM.getFilename(loc))}, {"line", SM.getSpellingLineNumber(loc)}, {"column", SM.getSpellingColumnNumber(loc)}};
  }
  bool inside(SourceLocation loc) {
    if (loc.isInvalid()) return false;
    std::string p = canonical(SM.getFilename(SM.getExpansionLoc(loc)));
    return p.compare(0, RootPath.size() + 1, RootPath + "/") == 0;
  }
  std::string kind(const NamedDecl *d) {
    if (isa<FunctionDecl>(d)) return "function";
    if (isa<RecordDecl>(d)) return cast<RecordDecl>(d)->isUnion() ? "union" : "struct";
    if (isa<EnumDecl>(d)) return "enum";
    if (isa<TypedefNameDecl>(d)) return "typedef";
    if (isa<FieldDecl>(d)) return "field";
    if (isa<EnumConstantDecl>(d)) return "enum_constant";
    if (auto v = dyn_cast<VarDecl>(d); v && v->hasGlobalStorage() && !v->isLocalVarDecl()) return "variable";
    return "";
  }
  std::string identity(const NamedDecl *d) {
    if (!d || kind(d).empty() || !inside(d->getLocation())) return "";
    d = cast<NamedDecl>(d->getCanonicalDecl());
    llvm::SmallString<256> usr;
    if (index::generateUSRForDecl(d, usr)) {
      auto loc = SM.getExpansionLoc(d->getLocation());
      usr = canonical(SM.getFilename(loc)) + ":" + std::to_string(SM.getFileOffset(loc));
    }
    // A header-local static function denotes a different entity in every TU.
    std::string key = usr.str().str();
    if (d->getFormalLinkage() == Linkage::Internal) key = TU + "::" + key;
    return key;
  }
  std::string record(const NamedDecl *d) {
    std::string id = identity(d);
    if (id.empty()) return "";
    if (Seen.insert(id).second)
      Symbols.push_back(llvm::json::Object{{"id", id}, {"name", d->getNameAsString().empty() ? "(anonymous)" : d->getNameAsString()}, {"kind", kind(d)}});
    return id;
  }
  void edge(const std::string &from, const NamedDecl *to, llvm::StringRef kind, SourceLocation loc, llvm::StringRef resolution) {
    if (from.empty() || !inside(loc)) return;
    auto target = record(to);
    if (target.empty() && kind != "indirect_call") return;
    llvm::json::Value targetValue = target.empty() ? llvm::json::Value(nullptr) : llvm::json::Value(target);
    Edges.push_back(llvm::json::Object{{"source", from}, {"target", std::move(targetValue)}, {"kind", kind}, {"resolution", resolution},
      {"expansion", point(SM.getExpansionLoc(loc))}, {"spelling", point(SM.getSpellingLoc(loc))}});
  }
  void declaredType(const NamedDecl *d, QualType qt) {
    if (qt.isNull()) return;
    qt = qt.getNonReferenceType();
    while (qt->isPointerType() || qt->isArrayType()) {
      if (auto a = Ctx.getAsArrayType(qt)) qt = a->getElementType();
      else qt = qt->getPointeeType();
    }
    const NamedDecl *target = nullptr;
    if (auto t = qt->getAs<TypedefType>()) target = t->getDecl();
    else if (auto t = qt->getAs<TagType>()) target = t->getDecl();
    if (target) edge(record(d), target, "declared_type", d->getLocation(), "compiler_resolved");
  }
public:
  explicit Visitor(ASTContext &c) : Ctx(c), SM(c.getSourceManager()) {}
  bool TraverseFunctionDecl(FunctionDecl *d) {
    auto saved = Owner; Owner = record(d);
    bool ok = RecursiveASTVisitor::TraverseFunctionDecl(d); Owner = saved; return ok;
  }
  bool TraverseVarDecl(VarDecl *d) {
    auto saved = Owner;
    if (d->hasGlobalStorage() && !d->isLocalVarDecl()) Owner = record(d);
    bool ok = RecursiveASTVisitor::TraverseVarDecl(d); Owner = saved; return ok;
  }
  bool VisitNamedDecl(NamedDecl *d) {
    auto id = record(d); if (id.empty()) return true;
    bool definition = false;
    if (auto f = dyn_cast<FunctionDecl>(d)) definition = f->isThisDeclarationADefinition();
    else if (auto t = dyn_cast<TagDecl>(d)) definition = t->isThisDeclarationADefinition();
    else if (auto v = dyn_cast<VarDecl>(d)) definition = v->isThisDeclarationADefinition() != VarDecl::DeclarationOnly;
    else definition = true;
    Locations.push_back(llvm::json::Object{{"symbol", id}, {"definition", definition},
      {"expansion", point(SM.getExpansionLoc(d->getLocation()))}, {"spelling", point(SM.getSpellingLoc(d->getLocation()))}});
    if (auto v = dyn_cast<ValueDecl>(d)) declaredType(d, v->getType());
    if (auto f = dyn_cast<FunctionDecl>(d)) {
      declaredType(d, f->getReturnType());
      for (auto p : f->parameters()) declaredType(d, p->getType());
    }
    if (auto t = dyn_cast<TypedefNameDecl>(d)) declaredType(d, t->getUnderlyingType());
    return true;
  }
  bool VisitCallExpr(CallExpr *e) {
    edge(Owner, e->getDirectCallee(), e->getDirectCallee() ? "direct_call" : "indirect_call", e->getCallee()->getExprLoc(),
      e->getDirectCallee() ? "compiler_resolved" : "unresolved"); return true;
  }
  bool VisitDeclRefExpr(DeclRefExpr *e) { edge(Owner, e->getDecl(), "reference", e->getLocation(), "compiler_resolved"); return true; }
  bool VisitMemberExpr(MemberExpr *e) { edge(Owner, e->getMemberDecl(), "reference", e->getMemberLoc(), "compiler_resolved"); return true; }
};
class Consumer : public ASTConsumer {
public: void HandleTranslationUnit(ASTContext &c) override { Visitor(c).TraverseDecl(c.getTranslationUnitDecl()); }
};
class Action : public ASTFrontendAction {
public: std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance &, llvm::StringRef) override { return std::make_unique<Consumer>(); }
};
class Diags : public DiagnosticConsumer {
public: void HandleDiagnostic(DiagnosticsEngine::Level level, const Diagnostic &info) override {
  DiagnosticConsumer::HandleDiagnostic(level, info);
  if (level >= DiagnosticsEngine::Error) ++Errors;
  llvm::SmallString<256> message; info.FormatDiagnostic(message);
  std::string severity = level >= DiagnosticsEngine::Error ? "error" : level == DiagnosticsEngine::Warning ? "warning" : "note";
  llvm::json::Object obj{{"severity", severity}, {"message", message.str().str()}};
  if (info.hasSourceManager() && info.getLocation().isValid()) {
    auto p = info.getSourceManager().getPresumedLoc(info.getSourceManager().getExpansionLoc(info.getLocation()));
    if (!p.isInvalid()) { obj["file"] = canonical(p.getFilename()); obj["line"] = p.getLine(); obj["column"] = p.getColumn(); }
  }
  Diagnostics.push_back(std::move(obj));
}};
int main(int argc, const char **argv) {
  auto parser = CommonOptionsParser::create(argc, argv, Category);
  if (!parser) { llvm::errs() << llvm::toString(parser.takeError()); return 2; }
  if (parser->getSourcePathList().size() != 1) { llvm::errs() << "Index exactly one TU per invocation\n"; return 2; }
  RootPath = canonical(Root); TU = canonical(parser->getSourcePathList()[0]);
  ClangTool tool(parser->getCompilations(), parser->getSourcePathList());
  Diags diagnostics; tool.setDiagnosticConsumer(&diagnostics);
  auto status = tool.run(newFrontendActionFactory<Action>().get());
  llvm::outs() << llvm::formatv("{0:2}\n", llvm::json::Value(llvm::json::Object{
    {"version", CLANG_VERSION_STRING}, {"tu", TU}, {"success", status == 0 && Errors == 0},
    {"symbols", std::move(Symbols)}, {"locations", std::move(Locations)}, {"edges", std::move(Edges)}, {"diagnostics", std::move(Diagnostics)}}));
  return status == 0 && Errors == 0 ? 0 : 1;
}
