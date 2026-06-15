import { createPagesFunctionHandler } from "@react-router/cloudflare";

// @ts-ignore - build output not yet typed
import * as build from "../build/server";

export const onRequest = createPagesFunctionHandler({ build });
