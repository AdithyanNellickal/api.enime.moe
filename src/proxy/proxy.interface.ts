export interface Proxy {
    username: string;
    password: string;
    port_http: number;
    port_socks5: number;
    address: string;
    country?: string;
    city?: string;
    used?: number;
}

export interface ProxyListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ProxyCallback[];
}

export interface ProxyCallback {
    username: string;
    password: string;
    proxy_address: string;
    ports: ProxyPort;
    country_code: string;
    city_name: string | null;
}

export interface ProxyPort {
    http: number;
    socks5: number;
}