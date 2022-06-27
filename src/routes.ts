import { Express, Request, Response } from 'express';
import log from './utils/logger';
import { useJSON, rootRes, endpointRes } from './index';

export default function (app: Express) {
	// define a route handler for the default home page
	app.get('/', (req: Request, res: Response) => processRoot(req, res));
	app.get('/healthcheck', (req: Request, res: Response) => processEndpoint(req, res));
}

function processRoot(req: Request, res: Response) {
	if (rootRes) res.send(processMessage(req));
	else res.sendStatus(404);
}
function processEndpoint(req: Request, res: Response) {
	if (endpointRes) res.send(processMessage(req));
	else res.sendStatus(404);
}

function processMessage(req: Request) {
	log.info(`⚡️ : Request from: ${req.ip}`);

	if (useJSON) return '{"Status": "OK"}';
	else return 'OK';
}
