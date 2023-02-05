import { Server } from 'http';
import request from 'supertest';
import app, { port, host, setEnv } from '../src/app';

let server: Server;

// setup before all tests begin
beforeAll(() => {
	process.env.NODE_ENV = 'test';
});

// setup before all tests begin
beforeEach(() => {
	server = app.listen(port, host); // start express server
});

// after each test is done
afterEach(() => {
	server.close(); // stop the express server
});

// testing endpoint /healthcheck
describe('ENDPOINT: /healthcheck', () => {
	// test JSON response
	it('JSON         - 200', async () => {
		setEnv(true, true, false); // set env var for the test - enable JSON and healthcheck endpoint disable root endpoint
		const res = await request(app).get('/healthcheck'); // run request

		expect(res.statusCode).toBe(200); // check for 200
		expect(res.body).toEqual({ status: 'OK' }); // check for JSON response
	});

	// test plaintext response
	it('TEXT         - 200', async () => {
		setEnv(false, true, false); // set env var for the test - enable plaintext and healthcheck endpoint disable root endpoint
		const res = await request(app).get('/healthcheck'); // run request

		expect(res.statusCode).toBe(200); // check for 200
		expect(res.text).toEqual('OK'); // check for plaintext response
	});

	// test if we contact root when disabled we get 404
	it('/            - 404', async () => {
		setEnv(false, true, false); // set env var for the test - enable plaintext and healthcheck endpoint disable root endpoint
		const res = await request(app).get('/'); // run request

		expect(res.statusCode).toBe(404); // check for 404
	});
});

describe('ENDPOINT: /', () => {
	it('JSON         - 200', async () => {
		setEnv(true, false, true);
		const res = await request(app).get('/');

		expect(res.statusCode).toBe(200);
		expect(res.body).toEqual({ status: 'OK' });
	});

	it('TEXT         - 200', async () => {
		setEnv(false, false, true);
		const res = await request(app).get('/');

		expect(res.statusCode).toBe(200);
		expect(res.text).toEqual('OK');
	});

	it('/healthcheck - 404', async () => {
		setEnv(false, false, true);
		const res = await request(app).get('/healthcheck');

		expect(res.statusCode).toBe(404);
	});
});

describe('ENDPOINT: both', () => {
	it('/            - 404', async () => {
		setEnv(false, false, false);
		const res = await request(app).get('/');

		expect(res.statusCode).toBe(404);
	});

	it('/healthcheck - 404', async () => {
		setEnv(false, false, false);
		const res = await request(app).get('/healthcheck');

		expect(res.statusCode).toBe(404);
	});
});
