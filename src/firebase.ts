
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
            credentials: ServiceAccount.credentials,
            scopes: ['https://www.googleapis.com/auth/firebase.database','https://www.googleapis.com/auth/userinfo.email']
        });
    }

    public async get( path: string ): Promise< any > {
        const token = await this.getAccessToken();
        return await fetch( `${ this.target }/${ path }.json`, {
            headers: { Authorization: `Bearer ${ token }` }
        }).then( response => response.json() );
    }

    public async orderBy( path: string, query: Partial< Record< "orderBy" | "equalTo" | "startAt" | "endAt" | "equalTo", any > > ): Promise< any > {
        const token = await this.getAccessToken();
        const params = new URLSearchParams();
        for ( const [ key, value ] of Object.entries( query ) ) {
            params.set( key, typeof value === "string" ? `"${ value }"` : JSON.stringify( value ) );
        }
        return await fetch( `${ this.target }/${ path }.json?${ params.toString() }`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then( response => response.json() );
    }

    public async set( path: string, value: any ): Promise< void > {
        const token = await this.getAccessToken();
        await fetch( `${ this.target }/${ path }.json`, {
            method: "PUT",
            body: typeof value === 'string' ? value : JSON.stringify( value ),
            headers: { "Content-Type": "application/json; charset=utf8", Authorization: `Bearer ${ token }` }
        });
    }

    public async push( path: string, value: any ): Promise< string > {
        const token = await this.getAccessToken();
        const res = await fetch(`${ this.target }/${ path }.json`, {
            method: 'POST',
            body: JSON.stringify( value ),
            headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${ token }` }
        });
        const { name } = await res.json() as { name: string };
        return name;
    }

    public async update( path: string, value: any ): Promise< void > {
        const token = await this.getAccessToken();
        await fetch( `${ this.target }/${ path }.json`, {
            method: "PATCH",
            body: typeof value === 'string' ? value : JSON.stringify( value ),
            headers: { "Content-Type": "application/json; charset=utf8", Authorization: `Bearer ${ token }` }
        });
    }

    public async delete( path: string ): Promise< void > {
        const token = await this.getAccessToken();
        await fetch(`${ this.target }/${ path }.json`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${ token }` }
        });
    }

}
