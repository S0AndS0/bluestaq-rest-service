import { Router } from 'express';

import {
	PostLogin,
	PostLogin_id,
} from './POST/login/index.ts';

const router = Router();

router.post('/login/:id', PostLogin_id);
router.post('/login', PostLogin);

export default router;
