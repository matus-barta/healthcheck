import express from 'express';
import routes from './routes';

// loading the config variables for server and routes config
export const port = Number(process.env.PORT ?? 8082);
export const host = process.env.HOST ?? '0.0.0.0';

export let useJSON = Boolean(process.env.JSON_RES ?? true);
export let endpointRes = Boolean(process.env.ENDPOINT_RES ?? false);
export let rootRes = Boolean(process.env.ROOT_RES ?? true);

const app = express(); // init express

app.use(express.json()); // init to use json middleware

routes(app); // load our routes (defined in routes.ts)

export default app; // export app express object (used mostly in index.ts)

// helper function to setup env variables outside of app.ts (used for testing)
export function setEnv(JSON: boolean, endpoint: boolean, root: boolean) {
	useJSON = JSON;
	endpointRes = endpoint;
	rootRes = root;
}
