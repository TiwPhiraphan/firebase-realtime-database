
import { z, type ZodType, type ZodObject } from "zod";
import { FirebaseSDK, type Credentials } from "./firebase";

type FirebaseCompatibleTypes = string | number | boolean | null;
type FirebaseInitialize = { credentials: Credentials, database: string };

class FirebaseCollection< Schema extends Record< string, ZodType > > {
    private database;
    private schema;
    private name;
    constructor( database: FirebaseSDK, name: string, schema: Schema ) {
        this.database = database;
        this.schema = z.object( schema );
        this.name = name;
    }
    async get(): Promise< z.infer< ZodObject< Schema > > | undefined > {
        return await this.database.get( this.name );
    }
    async set( value: z.infer< ZodObject< Schema > > ): Promise< void > {
        const data = this.schema.parse( value );
        return await this.database.set( this.name, data );
    }
    async delete() {
        return await this.database.delete( this.name );
    }
    async update( FunctionCallback: ( legacy: z.infer< ZodObject< Schema > > | undefined ) => z.infer< ZodObject< Schema > > | Promise< z.infer< ZodObject< Schema > > > ): Promise< void > {
        const legacy = await this.get();
        const update = await FunctionCallback( legacy );
        if ( legacy ) {
            return await this.database.update( this.name, update );
        }
        return await this.database.set( this.name, update );
    }
}

class FirebaseTable< Schema extends Record< string, ZodType > > {
    private database;
    private schema;
    private name;
    constructor( database: FirebaseSDK, name: string, schema: Schema ) {
        this.database = database;
        this.schema = z.object( schema );
        this.name = name;
    }
    async create( value: z.infer< ZodObject< Schema > > ): Promise< string > {
        const data = this.schema.parse( value );
        return await this.database.push( this.name, data );
    }
    async findAll(): Promise< ( z.infer< ZodObject< Schema > > & { _id: string } )[] > {
        const snapshot = await this.database.get( this.name ) as Record< string, z.infer< ZodObject< Schema > > > | null;
        const result: ( z.infer< ZodObject< Schema > > & { _id: string } )[] = [];
        if ( snapshot ) {
            for ( const _id of Object.keys( snapshot ) ) {
                result.push({ ...snapshot[_id]!, _id })
            }
        }
        return result;
    }
    async findById( id: string ): Promise< z.infer< ZodObject< Schema > > | undefined > {
        const response = await this.database.get( `${ this.name }/${ id }` ) as z.infer< ZodObject< Schema > > | null;
        if ( response ) {
            return response;
        }
    }
    async findByChild< K extends keyof z.infer< ZodObject< Schema > > >( where: K, value: z.infer< ZodObject< Schema > >[K] extends FirebaseCompatibleTypes ? z.infer< ZodObject< Schema > >[K] : never ): Promise< ( z.infer< ZodObject< Schema > > & { _id: string } ) | undefined > {
        const snapshot = await this.database.orderBy( this.name, { orderBy: where, equalTo: value } ) as Record< string, z.infer< ZodObject< Schema > > > | null;
        if ( snapshot ) {
            const _id = Object.keys( snapshot )[0] as string;
            return { ...snapshot[_id], _id } as z.infer< ZodObject< Schema > > & { _id: string }
        }
        return undefined;
    }
    async filterByChild< Key extends keyof z.infer< ZodObject< Schema > > >( where: Key, value: z.infer< ZodObject< Schema > >[Key] extends FirebaseCompatibleTypes ? z.infer< ZodObject< Schema > >[Key] : never ): Promise< ( z.infer< ZodObject< Schema > > & { _id: string } )[] > {
        const snapshot = await this.database.orderBy( this.name, { orderBy: where, equalTo: value } ) as Record< string, z.infer< ZodObject< Schema > > > | null;
        const result: ( z.infer< ZodObject< Schema > > & { _id: string } )[] = [];
        if ( snapshot ) {
            for ( const _id of Object.keys( snapshot ) ) {
                result.push( { ...snapshot[_id], _id } as z.infer< ZodObject< Schema > > & { _id: string } )
            }
        }
        return result;
    }
    async transitionByChild< K extends keyof z.infer< ZodObject< Schema > > >( key: K, value: z.infer< ZodObject< Schema > >[K] extends FirebaseCompatibleTypes ? z.infer< ZodObject< Schema > >[K] : never, FunctionUpdate: ( legacy: z.infer< ZodObject< Schema > > & { _id: string } ) => ( z.infer< ZodObject< Schema > > & { _id: string } ) | undefined | false | void | Promise< ( z.infer< ZodObject< Schema > > & { _id: string } ) | undefined | false | void > ): Promise< void > {
        const legacy = await this.findByChild( key, value );
        if ( legacy ) {
            const update = await FunctionUpdate( legacy );
            if ( update ) {
                const { _id, ...data } = update;
                await this.database.update( `${ this.name }/${ _id }`, data );
            }
        }
    }
    async transitionById( id: string, FunctionUpdate: ( legacy: z.infer< ZodObject< Schema > > ) => z.infer< ZodObject< Schema > > | undefined | false | void | Promise< z.infer< ZodObject< Schema > > | undefined | false | void > ): Promise< void > {
        const legacy = await this.findById( id );
        if ( legacy ) {
            const update = await FunctionUpdate( legacy );
            if ( update ) {
                await this.database.update( `${ this.name }/${ id }`, update );
            }
        }
    }
    async deleteById( id: string ): Promise< void > {
        return await this.database.delete( `${ this.name }/${ id }` );
    }
}

class FirebaseApp {
    private database: FirebaseSDK;
    constructor( initialize: FirebaseInitialize ) {
        this.database = new FirebaseSDK( initialize );
    }
    collection< Schema extends Record< string, ZodType > >( name: string, schema: Schema ) {
        return new FirebaseCollection( this.database, name, schema );
    }
    table< Schema extends Record< string, ZodType > >( name: string, schema: Schema ) {
        return new FirebaseTable( this.database, name, schema );
    }
}

export { z as zod, FirebaseApp, type Credentials }
