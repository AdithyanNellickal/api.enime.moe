import { Injectable, OnModuleInit } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { Proxy, ProxyCallback, ProxyListResponse } from './proxy.interface';
import { Cron } from '@nestjs/schedule';
import fetch from 'node-fetch';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export default class ProxyService implements OnModuleInit {
    private readonly listProxiesEndpoint = "https://proxy.webshare.io/api/proxy/list";

    private loading = false;

    private proxies: Proxy[] = [];

    constructor(private readonly databaseService: DatabaseService) {
    }

    @Cron("0 0 * * *", {
        name: "Refreshing proxy list"
    })
    async scheduledRefreshProxyList() {
        await this.load();
    }

    @Cron("* * * * *", {
        name: "Updating proxy usage to database"
    })
    async updateProxyUsedToDatabase() {
        if (!this.loading) {
            for (const proxy of this.proxies) {
                this.databaseService.proxy.update({
                    where: {
                        address: proxy.address
                    },
                    data: {
                        used: proxy.used
                    }
                })
            }
        }
    }

    async onModuleInit() {
        await this.load();
    }

    private getAvailableProxy(): Proxy {
        const available = this.proxies.sort((a, b) => a.used - b.used)[0];

        // Might only happen at the startup, in this case we use predefined proxy as backup
        if (!available) return {
            address: process.env.BACKUP_PROXY_ADDRESS,
            port_http: Number(process.env.BACKUP_PROXY_PORT_HTTP),
            port_socks5: Number(process.env.BACKUP_PROXY_PORT_SOCKS5),
            password: process.env.BACKUP_PROXY_PASSWORD,
            username: process.env.BACKUP_PROXY_USERNAME
        };

        for (let i = 0; i < this.proxies.length; i++) {
            if (this.proxies[i].address === available.address) {
                this.proxies[i].used += 1;
            }
        }

        return available;
    }

    async load() {
        this.loading = true;

        const proxyListResponse = (await (await fetch(this.listProxiesEndpoint, {
            headers: this.authHeader()
        })).json()) as ProxyListResponse;

        if (proxyListResponse?.results) {
            const proxies: ProxyCallback[] = proxyListResponse.results;

            await this.databaseService.proxy.deleteMany();

            const mappedProxies = proxies.map(proxy => {
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
            });

            await this.databaseService.proxy.createMany({
                data: mappedProxies
            });

            this.proxies = mappedProxies;
        }

        this.loading = false;
    }

    private authHeader(original = {}) {
        return {
            ...original,
            Authorization: process.env.WEBSHARE_API_KEY
        }
    }

    public getProxyAgent() {
        const proxy = this.getAvailableProxy();

        return new HttpsProxyAgent(`socks://${proxy.username}:${proxy.password}@${proxy.address}:${proxy.port_socks5}`);
    }
}
