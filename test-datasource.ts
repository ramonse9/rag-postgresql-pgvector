import dataSource from './src/database/data-source';

async function test() {
    try {
        console.log('Initializing DataSource...');

        await dataSource.initialize();

        console.log('✅ DataSource initialized');

        console.log(
            'Entities:',
            dataSource.entityMetadatas.map(entity => entity.name),
        );

        console.log(
            'Migrations:',
            dataSource.migrations.map(migration => migration.name),
        );

        await dataSource.destroy();

        console.log('Connection closed');
    } catch (error) {
        console.error('❌ DataSource failed');
        console.error(error);
    }
}

test();