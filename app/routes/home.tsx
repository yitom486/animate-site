import { redirect } from "react-router";
import type { Route } from "./+types/home";

export function loader(_args: Route.LoaderArgs) {
  return redirect("/anime");
}
