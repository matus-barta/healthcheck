import express from 'express';
import routes from './routes';

export const port = Number(process.env.PORT ?? 8082);
export const host = process.env.HOST ?? '0.0.0.0';

export let useJSON = Boolean(process.env.JSON_RES ?? true);
export let endpointRes = Boolean(process.env.ENDPOINT_RES ?? false);
export let rootRes = Boolean(process.env.ROOT_RES ?? true);

const app = express();

app.use(express.json());

routes(app);

export default app;

export function setEnv(JSON: boolean, endpoint: boolean, root: boolean) {
	useJSON = JSON;
	endpointRes = endpoint;
	rootRes = root;
}
