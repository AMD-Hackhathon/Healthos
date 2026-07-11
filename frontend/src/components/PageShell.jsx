import NavBar from "./NavBar";

export default function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-bg">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
