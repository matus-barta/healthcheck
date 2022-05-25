import { Express, Request, Response } from 'express';
import log from './utils/logger';

export default function (app: Express) {
	// define a route handler for the default home page
	app.get('/', (req: Request, res: Response) => processRoot(req, res));
	app.get('/healthcheck', (req: Request, res: Response) => processEndpoint(req, res));
}

function processRoot(req: Request, res: Response) {
	if (process.env.ROOT_RES == 'true') res.send(processMessage(req));
}
function processEndpoint(req: Request, res: Response) {
	if (process.env.ENDPOINT_RES == 'true') res.send(processMessage(req));
}

function processMessage(req: Request) {
	log.info(`Request from: ${req.ip}`);

	if (process.env.JSON_RES == 'true') return '{"Status": "OK"}';
	else return 'OK';
}
