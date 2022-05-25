import logger from 'pino';
import dayjs from 'dayjs';

const log = logger({
	prettyPrint: true, //TODO: Fix this deprecated issue
	base: {
		pid: false
	},
	timestamp: () => `,"time":"${dayjs().format()}"`
});

export default log;
