import express from 'express';
import dotenv from 'dotenv';
import log from './utils/logger';
import routes from './routes';

// initialize configuration
dotenv.config();

const app = express();

const port = Number(process.env.PORT ?? 8082);
const host = process.env.HOST ?? 'localhost';

export const useJSON = Boolean(process.env.JSON_RES ?? true);
export const endpointRes = Boolean(process.env.ENDPOINT_RES ?? false);
export const rootRes = Boolean(process.env.ROOT_RES ?? true);

app.use(express.json());

app.listen(port, host, () => {
	log.info(`⚡️ : Server is running at http://${host}:${port}`);
	checkEnvEndpoints();
	routes(app);
});
app.on('error', (error) => {
	log.error('❌ : Server error:', error);
});

function checkEnvEndpoints() {
	if (rootRes || endpointRes) {
		log.info(
			`⚡️ : Root Endpoint is ${translateBoolToEmoji(
				rootRes
			)} and Healthcheck endpoint is ${translateBoolToEmoji(endpointRes)}`
		);
		log.info(`⚡️ : JSON response is ${translateBoolToEmoji(useJSON)}`);
	} else {
		log.error('❌ : Root and Healthcheck endpoints are both disabled!');
		process.exit(1);
	}
}

function translateBoolToEmoji(boolInput: boolean): string {
	if (process.platform == 'win32') return boolInput.toString();

	if (boolInput) {
		return '✅';
	} else {
		return '❌';
	}
}
