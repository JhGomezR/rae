import { manejador } from 'api';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: false, responseLimit: false, externalResolver: true },
  maxDuration: 300,
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return manejador(req, res);
}
