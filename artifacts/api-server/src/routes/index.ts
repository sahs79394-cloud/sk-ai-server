import { Router, type IRouter } from "express";
import healthRouter from "./health";
import skRouter from "./sk";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sk", skRouter);

export default router;
