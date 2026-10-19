import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import sahraRouter from "./sahra.js";
import legalRouter from "./legal.js";
import notificationsRouter from "./notifications.js";
import messagesRouter from "./messages.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sahraRouter);
router.use(legalRouter);
router.use(notificationsRouter);
router.use(messagesRouter);

export default router;
