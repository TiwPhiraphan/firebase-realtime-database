import type { ZodType, infer as ZodInfer, ZodObject } from "zod";
import type { Database } from "firebase-admin/database";
import firebase from "firebase-admin";
import { v7 as uuid } from "uuid";
import z from "zod";

type FirebaseOptions = {
    readonly database: string
    readonly credential: { readonly projectId: string, readonly privateKey: string, readonly clientEmail: string }
}

type FirebaseCompatibleTypes = string | number | boolean | null;

class FirebaseCollection< Schema extends Record< string, ZodType > > {
    private database;
    private schema;
    private name;
    constructor( database: Database, name: string, schema: Schema ) {
        this.database = database;
        this.schema = z.object( schema );
        this.name = name;
    }
    async get(): Promise< ZodInfer< ZodObject< Schema > > | undefined > {
        return await this.database.ref( this.name ).get().then( snapshot => snapshot.exists() ? snapshot.val() : undefined );
    }
    async set( value: ZodInfer< ZodObject< Schema > > ): Promise< void > {
        const data = this.schema.parse( value );
        return await this.database.ref( this.name ).set( data );
    }
    async delete() {
        return await this.database.ref( this.name ).remove();
    }
    async update( FunctionCallback: ( legacy: ZodInfer< ZodObject< Schema > > | undefined ) => ZodInfer< ZodObject< Schema > > | Promise< ZodInfer< ZodObject< Schema > > > ): Promise< void > {
        const legacy = await this.get();
        const update = await FunctionCallback( legacy );
        const reference = this.database.ref( this.name );
        return await ( legacy ? reference.update( update ) : reference.set( update ) );
    }
}

class FirebaseTable< Schema extends Record< string, ZodType > > {
    private database;
    private schema;
    private name;
    constructor( database: Database, name: string, schema: Schema ) {
        this.database = database;
        this.schema = z.object( schema );
        this.name = name;
    }
    async create( value: ZodInfer< ZodObject< Schema > > ): Promise< string > {
        const data = this.schema.parse( value );
        const id = uuid();
        await this.database.ref( `${ this.name }/${ id }` ).set( data );
        return id;
    }
    async findAll(): Promise< ( ZodInfer< ZodObject< Schema > > & { _id: string } )[] > {
        const snapshot = await this.database.ref( this.name ).get();
        const result: ( ZodInfer< ZodObject< Schema > > & { _id: string } )[] = [];
        if ( snapshot.exists() ) {
            const value = snapshot.val() as Record< string, ZodInfer< ZodObject< Schema > > >;
            for ( const _id of Object.keys( value ) ) {
                result.push({ ...value[_id]!, _id })
            }
        }
        return result;
    }
    async findById( id: string ): Promise< ZodInfer< ZodObject< Schema > > | undefined > {
        return await this.database.ref( `${ this.name }/${ id }` ).get().then( snapshot => snapshot.exists() ? snapshot.val() : undefined );
    }
    async findByChild< K extends keyof ZodInfer< ZodObject< Schema > > >( where: K, value: ZodInfer< ZodObject< Schema > >[K] extends FirebaseCompatibleTypes ? ZodInfer< ZodObject< Schema > >[K] : never ): Promise< ( ZodInfer< ZodObject< Schema > > & { _id: string } ) | undefined > {
        const snapshot = await this.database.ref( this.name ).orderByChild( where as string ).equalTo( value ).get();
        if ( snapshot.exists() ) {
            const value = snapshot.val();
            const _id = Object.keys( value )[0]!;
            return { ...value[_id], _id }
        }
        return undefined;
    }
    async filterByChild< Key extends keyof ZodInfer< ZodObject< Schema > > >( where: Key, value: ZodInfer< ZodObject< Schema > >[Key] extends FirebaseCompatibleTypes ? ZodInfer< ZodObject< Schema > >[Key] : never ): Promise< ( ZodInfer< ZodObject< Schema > > & { _id: string } )[] > {
        const snapshot = await this.database.ref( this.name ).orderByChild( where as string ).equalTo( value ).get();
        const result: ( ZodInfer< ZodObject< Schema > > & { _id: string } )[] = []
        if ( snapshot.exists() ) {
            const value = snapshot.val();
            for ( const _id of Object.keys( value ) ) {
                result.push({ ...value[_id], _id })
            }
        }
        return result;
    }
    async transitionByChild< K extends keyof ZodInfer< ZodObject< Schema > > >( key: K, value: ZodInfer< ZodObject< Schema > >[K] extends FirebaseCompatibleTypes ? ZodInfer< ZodObject< Schema > >[K] : never, FunctionUpdate: ( legacy: ZodInfer< ZodObject< Schema > > & { _id: string } ) => ( ZodInfer< ZodObject< Schema > > & { _id: string } ) | undefined | false | void | Promise< ( ZodInfer< ZodObject< Schema > > & { _id: string } ) | undefined | false | void > ): Promise< void > {
        const legacy = await this.findByChild( key, value );
        if ( legacy ) {
            const update = await FunctionUpdate( legacy );
            if ( update ) {
                const { _id, ...data } = update;
                await this.database.ref( `${ this.name }/${ _id }` ).update( data );
            }
        }
    }
    async transitionById( id: string, FunctionUpdate: ( legacy: ZodInfer< ZodObject< Schema > > ) => ZodInfer< ZodObject< Schema > > | undefined | false | void | Promise< ZodInfer< ZodObject< Schema > > | undefined | false | void > ): Promise< void > {
        const legacy = await this.findById( id );
        if ( legacy ) {
            const update = await FunctionUpdate( legacy );
            if ( update ) {
                await this.database.ref( `${ this.name }/${ id }` ).update( update );
            }
        }
    }
    async deleteById( id: string ): Promise< void > {
        return await this.database.ref( `${ this.name }/${ id }` ).remove()
    }
}

class FirebaseApp {
    private database: Database;
    constructor( initialize: FirebaseOptions ) {
        const credential = firebase.credential.cert( initialize.credential );
        const application = firebase.apps.length !== 0 ? firebase.app() : firebase.initializeApp({ credential, databaseURL: initialize.database }, `firebase-realtime-database-${ uuid() }`);
        this.database = application.database();
    }
    collection< Schema extends Record< string, ZodType > >( name: string, schema: Schema ) {
        return new FirebaseCollection( this.database, name, schema );
    }
    table< Schema extends Record< string, ZodType > >( name: string, schema: Schema ) {
        return new FirebaseTable( this.database, name, schema );
    }
}

export { z as zod, FirebaseApp }
