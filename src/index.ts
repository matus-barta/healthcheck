import express from 'express';
import dotenv from 'dotenv';
import log from './utils/logger';
import routes from './routes';

// initialize configuration
dotenv.config();

const app = express();

const port = Number(process.env.PORT ?? 8082);
const host = process.env.HOST ?? 'localhost';

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
	if (process.env.ROOT_RES || process.env.ENDPOINT_RES) {
		log.info(
			`⚡️ : Root Endpoint is ${translateBoolToEmoji(
				Boolean(process.env.ROOT_RES)
			)} and Healthcheck endpoint is ${translateBoolToEmoji(Boolean(process.env.ENDPOINT_RES))}`
		);
		log.info(`⚡️ : JSON response is ${translateBoolToEmoji(Boolean(process.env.JSON_RES))}`);
	} else {
		log.error('❌ : Root and Healthcheck endpoints are both disabled!');
		process.exit(1);
	}
}

function translateBoolToEmoji(boolInput: boolean): string {
	if (boolInput) {
		return '✅';
	} else {
		return '❌';
	}
}
