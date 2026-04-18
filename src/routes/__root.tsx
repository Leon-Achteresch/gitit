import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <nav className="row" style={{ gap: "1rem", padding: "1rem" }}>
        <Link to="/" activeProps={{ style: { fontWeight: "bold" } }}>
          Home
        </Link>
        <Link to="/about" activeProps={{ style: { fontWeight: "bold" } }}>
          About
        </Link>
      </nav>
      <hr />
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
