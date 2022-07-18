-- CreateTable
CREATE TABLE `proxies` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `port_http` INTEGER NOT NULL,
    `port_socks5` INTEGER NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NULL,
    `used` INTEGER NOT NULL,

    UNIQUE INDEX `proxies_address_key`(`address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anime` (
    `id` VARCHAR(191) NOT NULL,
    `anilistId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `anime_anilistId_key`(`anilistId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `episode` (
    `id` VARCHAR(191) NOT NULL,
    `animeId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `video` VARCHAR(191) NOT NULL,
    `websiteId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relation` (
    `id` VARCHAR(191) NOT NULL,
    `animeId` VARCHAR(191) NOT NULL,
    `type` ENUM('PREQUEL', 'SEQUEL') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `website` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `website_url_key`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `episode` ADD CONSTRAINT `episode_animeId_fkey` FOREIGN KEY (`animeId`) REFERENCES `anime`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `episode` ADD CONSTRAINT `episode_websiteId_fkey` FOREIGN KEY (`websiteId`) REFERENCES `website`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relation` ADD CONSTRAINT `relation_animeId_fkey` FOREIGN KEY (`animeId`) REFERENCES `anime`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
