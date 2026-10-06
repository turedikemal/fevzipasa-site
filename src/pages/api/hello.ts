import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  message: string;
  timestamp: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    res.status(405).json({
      message: 'Method Not Allowed',
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(200).json({
    message: 'Fevzipaşa API çalışıyor!',
    timestamp: new Date().toISOString(),
  });
}
