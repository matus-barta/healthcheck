import dotenv from 'dotenv';
import log from './utils/logger';
import app, { useJSON, endpointRes, rootRes, port, host } from './app';

// initialize configuration
dotenv.config();

app.listen(port, host, () => {
	log.info(`⚡️ : Server is running at http://${host}:${port}`);
	checkEnvEndpoints();
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
