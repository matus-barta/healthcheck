import { Express, Request, Response } from 'express';
import log from './utils/logger';
import { useJSON, rootRes, endpointRes } from './app';

// default function to handle route registration
export default function (app: Express) {
	// define a route handler for the root route
	app.get('/', (req: Request, res: Response) => processRoot(req, res));

	//define a route for the /healthcheck route
	app.get('/healthcheck', (req: Request, res: Response) => processEndpoint(req, res));
}

// handle root route
function processRoot(req: Request, res: Response) {
	if (rootRes) res.send(processMessage(req, res)); // if enabled respond
	else res.sendStatus(404); // if not return 404
}

// handle /healthcheck route
function processEndpoint(req: Request, res: Response) {
	if (endpointRes) res.send(processMessage(req, res));
	else res.sendStatus(404);
}

// log request (if testing) and response with JSON or plaintext based on settings 
function processMessage(req: Request, res: Response) {
	if (process.env.NODE_ENV != 'test') log.info(`⚡️ : Request from: ${req.ip}`);

	if (useJSON) {
		res.type('json'); // set response type
		return '{"status": "OK"}'; // return response
	} else {
		res.type('text/plain');
		return 'OK';
	}
}
