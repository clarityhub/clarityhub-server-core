import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';

const { JWT_PUBLIC_KEY, JWT_SECRET_KEY } = process.env;

const JWT_OPTIONS = { algorithm: 'RS256' };
const JWT_DECODE_OPTIONS = { algorithms: ['RS256'] };
const EXP_TIME = '1hr';
const REFRESH_TIME = '7 days';
// const EXP_TIME = '1min';
// const REFRESH_TIME = '1hr';

const config = {
	jwksUri: process.env.JWKS_URI,
	algorithm: ['RS256'],
};

const client = jwksClient(config);

const getKey = (header, callback) => {
	client.getSigningKey(header.kid, (err, key) => {
		if (err) {
			callback(err);
		}

		const signingKey = key.publicKey || key.rsaPublicKey;
		callback(null, signingKey);
	});
};

export default function JWT() {
	return {
		/**
         * Verify token with 3rd party
         */
		auth0Decode(token) {
			const options = {};

			return new Promise((resolve, reject) => {
				jwt.verify(token, getKey, options, (err, decoded) => {
					if (err) {
						reject(err);
						return;
					}

					resolve(decoded);
				});
			});
		},

		/**
         * Self sign a token
         */
		selfSign(claims) {
			if (!JWT_SECRET_KEY) {
				throw new Error('Cannot create tokens!');
			}

			return jwt.sign(
				claims,
				JWT_SECRET_KEY,
				Object.assign(
					{},
					JWT_OPTIONS,
					{
						expiresIn: EXP_TIME,
					}
				)
			);
		},

		/**
		 * Create refresh token
		 */
		refreshToken(claims) {
			if (!JWT_SECRET_KEY) {
				throw new Error('Cannot create tokens!');
			}

			return jwt.sign(
				claims,
				JWT_SECRET_KEY,
				Object.assign(
					{},
					JWT_OPTIONS,
					{
						expiresIn: REFRESH_TIME,
					}
				)
			);
		},

		/**
         * Self decode a token
         */
		selfDecode(token) {
			const decoded = jwt.decode(token);

			if (!decoded) {
				throw new createError.Unauthorized('A valid token was not provided');
			}

			return new Promise((resolve, reject) => {
				jwt.verify(token, JWT_PUBLIC_KEY, JWT_DECODE_OPTIONS, (err, data) => {
					if (err) {
						reject(err);
						return;
					}

					resolve(data);
				});
			});
		},
	};
}
