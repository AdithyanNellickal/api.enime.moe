import { Injectable, OnModuleInit } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { Proxy, ProxyCallback, ProxyListResponse } from './proxy.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export default class ProxyService implements OnModuleInit {
    private readonly listProxiesEndpoint = "https://proxy.webshare.io/api/proxy/list";

    private loading = false;

    constructor(private readonly databaseService: DatabaseService) {
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
        name: "Refreshing proxy list"
    })
    async scheduledRefreshProxyList() {
        await this.load();
    }

    async onModuleInit() {
        await this.load();
    }

    private async getAvailableProxy(): Promise<Proxy> {
        const available = await this.databaseService.proxy.findFirst({
            orderBy: {
                used: "asc"
            }
        });

        // Might only happen at the startup, in this case we use predefined proxy as backup
        if (!available) return {
            address: process.env.BACKUP_PROXY_ADDRESS,
            port_http: Number(process.env.BACKUP_PROXY_PORT_HTTP),
            port_socks5: Number(process.env.BACKUP_PROXY_PORT_SOCKS5),
            password: process.env.BACKUP_PROXY_PASSWORD,
            username: process.env.BACKUP_PROXY_USERNAME
        };

        await this.databaseService.proxy.update({
            where: {
                id: available.id
            },
            data: {
                used: {
                    increment: 1
                }
            }
        })
        return available;
    }

    async load() {
        this.loading = true;

        const proxyListResponse = (await (await fetch(this.listProxiesEndpoint, {
            headers: this.authHeader()
        })).json()) as ProxyListResponse;

        if (proxyListResponse?.results) {
            const proxies: ProxyCallback[] = proxyListResponse.results;

            await this.databaseService.$transaction([
                this.databaseService.proxy.deleteMany(),
                this.databaseService.proxy.createMany({
                    data: proxies.map(proxy => {
                        return {
                            username: proxy.username,
                            password: proxy.password,
                            port_http: proxy.ports.http,
                            port_socks5: proxy.ports.socks5,
                            address: proxy.proxy_address,
                            country: proxy.country_code,
                            city: proxy.city_name,
                            used: 0,
                        }
                    })
                })
            ])
        }
        this.loading = false;
    }

    private authHeader(original = {}) {
        return {
            ...original,
            Authorization: process.env.WEBSHARE_API_KEY
        }
    }

    public async getProxyAgent() {
        const proxy = await this.getAvailableProxy();

        return new HttpsProxyAgent(`socks://${proxy.username}:${proxy.password}@${proxy.address}:${proxy.port_socks5}`);
    }
}
