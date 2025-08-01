
import { GoogleAuth, type AuthClient } from "google-auth-library";

export type Credentials = {
    readonly type?: string
    readonly auth_uri?: string
    readonly token_uri?: string
    readonly client_id?: string
    readonly project_id: string
    readonly private_key: string
    readonly client_email: string
    readonly private_key_id?: string
    readonly universe_domain?: string
    readonly client_x509_cert_url?: string
    readonly auth_provider_x509_cert_url?: string
}

export type FirebaseQueryParams = Partial<{
    orderBy: any;
    equalTo: any;
    startAt: any;
    endAt: any;
    limitToFirst: number;
    limitToLast: number;
    shallow: boolean;
    print: "pretty" | "silent";
    format: "export";
    timeout: string; // เช่น "5s", "100ms"
}>;

export class FirebaseSDK {
    private auth: GoogleAuth< AuthClient >;
    private target: string;
    private storage = { token: '', expire: 0 };
    private async getAccessToken(): Promise< string > {
        const now = Date.now();
        const { token, expire } = this.storage;
        if ( !token || now > expire ) {
            this.storage.token = await this.auth.getAccessToken() as string;
            this.storage.expire = now + 33e5;
        }
        return this.storage.token;
    }
    constructor( ServiceAccount: { credentials: Credentials, database: string } ) {
        this.target = ServiceAccount.database.endsWith('/') ? ServiceAccount.database.slice(0,-1) : ServiceAccount.database;
        this.auth = new GoogleAuth({
            credentials: {
                ...ServiceAccount.credentials,
                private_key: ServiceAccount.credentials.private_key.replace(/\\n/g,'\n')
            },
            scopes: ['https://www.googleapis.com/auth/firebase.database','https://www.googleapis.com/auth/userinfo.email']
        });
    }
    public async get( path: string ): Promise< any > {
        const token = await this.getAccessToken();
        return await fetch( `${ this.target }/${ path }.json`, {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${ token }` }
        }).then( response => response.json() );
    }
    public async orderBy( path: string, query: FirebaseQueryParams ): Promise< any > {
        const token = await this.getAccessToken();
        const params = new URLSearchParams();
        for ( const [ key, value ] of Object.entries( query ) ) {
            params.set( key, typeof value === "string" ? `"${ value }"` : JSON.stringify( value ) );
        }
        return await fetch( `${ this.target }/${ path }.json?${ params.toString() }`, {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}` }
        }).then( response => response.json() );
    }
    public async set( path: string, value: any ): Promise< void > {
        const token = await this.getAccessToken();
        await fetch( `${ this.target }/${ path }.json`, {
            method: 'PUT',
            cache: 'no-store',
            body: typeof value === 'string' ? value : JSON.stringify( value ),
            headers: { "Content-Type": "application/json; charset=utf8", Authorization: `Bearer ${ token }` }
        });
    }
    public async push( path: string, value: any ): Promise< string > {
        const token = await this.getAccessToken();
        const res = await fetch(`${ this.target }/${ path }.json`, {
            method: 'POST',
            cache: 'no-store',
            body: JSON.stringify( value ),
            headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${ token }` }
        });
        const { name } = await res.json() as { name: string };
        return name;
    }
    public async update( path: string, value: any ): Promise< void > {
        const token = await this.getAccessToken();
        await fetch( `${ this.target }/${ path }.json`, {
            method: 'PATCH',
            cache: 'no-store',
            body: typeof value === 'string' ? value : JSON.stringify( value ),
            headers: { "Content-Type": "application/json; charset=utf8", Authorization: `Bearer ${ token }` }
        });
    }
    public async delete( path: string ): Promise< void > {
        const token = await this.getAccessToken();
        await fetch(`${ this.target }/${ path }.json`, {
            method: 'DELETE',
            cache: 'no-store',
            headers: { Authorization: `Bearer ${ token }` }
        });
    }
}
