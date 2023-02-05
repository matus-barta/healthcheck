import dotenv from 'dotenv';
import log from './utils/logger';
import app, { useJSON, endpointRes, rootRes, port, host } from './app';

// initialize configuration
dotenv.config();

// start HTTP server to be listening
app.listen(port, host, () => {
	log.info(`⚡️ : Server is running at http://${host}:${port}`);
	checkEnvEndpoints(); // show what setting we are using and check if they are correct
});

// HTTP server error handling
app.on('error', (error) => {
	log.error('❌ : Server error:', error);
});

// write to console what configuration we are running and if the config. is incorrect we terminate the application
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

// little bit if silly translation of returning emoji instead of true/false is its supported
function translateBoolToEmoji(boolInput: boolean): string {
	if (process.platform == 'win32') return boolInput.toString();

	if (boolInput) {
		return '✅';
	} else {
		return '❌';
	}
}
