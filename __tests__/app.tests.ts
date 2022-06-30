import { Server } from 'http';
import request from 'supertest';
import app, { port, host, setEnv } from '../src/app';

let server: Server;

beforeAll(() => {
	process.env.NODE_ENV = 'test';
});

beforeEach(() => {
	server = app.listen(port, host);
});

afterEach(() => {
	server.close();
});

describe('ENDPOINT: /healthcheck', () => {
	it('JSON         - 200', async () => {
		setEnv(true, true, false);
		const res = await request(app).get('/healthcheck');

		expect(res.statusCode).toBe(200);
		expect(res.body).toEqual({ status: 'OK' });
	});

	it('TEXT         - 200', async () => {
		setEnv(false, true, false);
		const res = await request(app).get('/healthcheck');

		expect(res.statusCode).toBe(200);
		expect(res.text).toEqual('OK');
	});

	it('/            - 404', async () => {
		setEnv(false, true, false);
		const res = await request(app).get('/');

		expect(res.statusCode).toBe(404);
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
