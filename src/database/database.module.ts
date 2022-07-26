import { Module } from '@nestjs/common';
import DatabaseService from './database.service';

@Module({
    providers: [DatabaseService],
    exports: [DatabaseService]
})
export default class DatabaseModule {
    constructor(public readonly databaseService: DatabaseService) {
        this.databaseService = databaseService;
    }
}