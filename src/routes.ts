import { Express, Request, Response } from 'express';
import log from './utils/logger';
import { useJSON, rootRes, endpointRes } from './app';

export default function (app: Express) {
	// define a route handler for the default home page
	app.get('/', (req: Request, res: Response) => processRoot(req, res));
	app.get('/healthcheck', (req: Request, res: Response) => processEndpoint(req, res));
}

function processRoot(req: Request, res: Response) {
	if (rootRes) res.send(processMessage(req, res));
	else res.sendStatus(404);
}
function processEndpoint(req: Request, res: Response) {
	if (endpointRes) res.send(processMessage(req, res));
	else res.sendStatus(404);
}

function processMessage(req: Request, res: Response) {
	if (process.env.NODE_ENV != 'test') log.info(`⚡️ : Request from: ${req.ip}`);

	if (useJSON) {
		res.type('json');
		return '{"status": "OK"}';
	} else {
		res.type('text/plain');
		return 'OK';
	}
}
