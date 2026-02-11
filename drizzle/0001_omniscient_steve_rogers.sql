CREATE TABLE `chatHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`role` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pivotData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`glAccount` varchar(200) NOT NULL,
	`total` double,
	`costCenterData` json,
	CONSTRAINT `pivotData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plVariance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`store` varchar(200) NOT NULL,
	`lineItem` varchar(200) NOT NULL,
	`decActual` double,
	`decActualPct` double,
	`decBudget` double,
	`decBudgetPct` double,
	`decLastyear` double,
	`decLastyearPct` double,
	`varBudgetAmt` double,
	`varBudgetPct` double,
	`varLastyearAmt` double,
	`varLastyearPct` double,
	`ytdActual` double,
	`ytdActualPct` double,
	`ytdBudget` double,
	`ytdBudgetPct` double,
	`ytdLastyear` double,
	`ytdLastyearPct` double,
	`ytdVarBudgetAmt` double,
	`ytdVarBudgetPct` double,
	`ytdVarLastyearAmt` double,
	`ytdVarLastyearPct` double,
	CONSTRAINT `plVariance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(200) NOT NULL,
	`openingDate` varchar(20),
	`age` varchar(20),
	`sales` double,
	`budget` double,
	`cogs` double,
	`grossProfit` double,
	`grossProfitPct` double,
	`staffCost` double,
	`staffCostPct` double,
	`marketingExp` double,
	`marketingExpPct` double,
	`rent` double,
	`rentPct` double,
	`royalty` double,
	`royaltyPct` double,
	`otherOpex` double,
	`otherOpexPct` double,
	`operatingProfit` double,
	`operatingProfitPct` double,
	`depreciation` double,
	`amortization` double,
	`others` double,
	`npBeforeOverhead` double,
	`overhead` double,
	`netProfit` double,
	`netProfitPct` double,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `stores_storeName_unique` UNIQUE(`storeName`)
);
