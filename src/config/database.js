/**
 * 🔧 DATABASE CONFIG FIX - MongoDB Connection
 * Ort: src/config/database.js
 * Problem: bufferMaxEntries Option ist veraltet
 */

const mongoose = require('mongoose');

class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.connection = null;
        this.connectionAttempts = 0;
        this.maxRetryAttempts = 5;
        this.retryDelay = 5000; // 5 seconds
        
        // MongoDB connection configuration - AKTUALISIERT
        this.mongoConfig = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000, // 45 seconds
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 5, // Maintain a minimum of 5 socket connections
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            // bufferMaxEntries: 0 <- DIESE ZEILE ENTFERNT (veraltet)
        };
        
        console.log('🗄️ DatabaseManager initialisiert');
    }

    // Get MongoDB connection string from environment
    getConnectionString() {
        // Try different environment variable names
        const mongoUri = 
            process.env.MONGODB_URI || 
            process.env.MONGO_URI || 
            process.env.DATABASE_URL ||
            'mongodb://localhost:27017/all-ki-dev';
        
        return mongoUri;
    }

    // Main connection method
    async connect() {
        try {
            const connectionString = this.getConnectionString();
            console.log(`🔌 Verbinde mit MongoDB...`);
            console.log(`📍 Connection String: ${connectionString.replace(/\/\/.*:.*@/, '//***:***@')}`); // Hide credentials in logs
            
            // Connect to MongoDB
            this.connection = await mongoose.connect(connectionString, this.mongoConfig);
            
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            console.log('✅ MongoDB erfolgreich verbunden!');
            console.log(`📊 Database: ${this.connection.connection.name}`);
            console.log(`🏠 Host: ${this.connection.connection.host}:${this.connection.connection.port}`);
            
            // Set up connection event listeners
            this.setupEventListeners();
            
            // Test the connection with a simple operation
            await this.testConnection();
            
            return true;
            
        } catch (error) {
            console.error('❌ MongoDB Verbindungsfehler:', error.message);
            this.isConnected = false;
            this.connectionAttempts++;
            
            // Retry connection if under max attempts
            if (this.connectionAttempts < this.maxRetryAttempts) {
                console.log(`🔄 Retry ${this.connectionAttempts}/${this.maxRetryAttempts} in ${this.retryDelay/1000} Sekunden...`);
                setTimeout(() => this.connect(), this.retryDelay);
            } else {
                console.error('🚫 Maximale Anzahl von Verbindungsversuchen erreicht');
                console.log('⚡ Fallback-Modus aktiv - System läuft ohne Datenbank');
            }
            
            return false;
        }
    }

    // Set up MongoDB event listeners
    setupEventListeners() {
        const db = mongoose.connection;
        
        db.on('connected', () => {
            console.log('📡 MongoDB Verbindung hergestellt');
        });
        
        db.on('error', (error) => {
            console.error('💥 MongoDB Verbindungsfehler:', error);
            this.isConnected = false;
        });
        
        db.on('disconnected', () => {
            console.log('📴 MongoDB Verbindung getrennt');
            this.isConnected = false;
            
            // Try to reconnect
            if (this.connectionAttempts < this.maxRetryAttempts) {
                console.log('🔄 Versuche Reconnect...');
                this.connect();
            }
        });
        
        db.on('reconnected', () => {
            console.log('🔄 MongoDB erfolgreich reconnected');
            this.isConnected = true;
        });
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    // Test connection with a simple operation
    async testConnection() {
        try {
            await mongoose.connection.db.admin().ping();
            console.log('🏓 Database Ping erfolgreich');
            return true;
        } catch (error) {
            console.error('🏓 Database Ping fehlgeschlagen:', error.message);
            return false;
        }
    }

    // Disconnect from MongoDB
    async disconnect() {
        try {
            if (this.isConnected) {
                await mongoose.connection.close();
                this.isConnected = false;
                console.log('👋 MongoDB Verbindung geschlossen');
            }
        } catch (error) {
            console.error('❌ Fehler beim Schließen der MongoDB Verbindung:', error);
        }
    }

    // Get connection status details
    getConnectionStatus() {
        const connection = mongoose.connection;
        
        return {
            isConnected: this.isConnected,
            readyState: connection.readyState,
            readyStateText: this.getReadyStateText(connection.readyState),
            host: connection.host || 'unknown',
            port: connection.port || 'unknown',
            name: connection.name || 'unknown',
            collections: Object.keys(connection.collections || {}),
            connectionAttempts: this.connectionAttempts,
            maxRetryAttempts: this.maxRetryAttempts
        };
    }

    // Convert MongoDB ready state to human readable text
    getReadyStateText(state) {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[state] || 'unknown';
    }

    // Health check method
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { 
                    status: 'disconnected', 
                    message: 'Database not connected',
                    details: this.getConnectionStatus()
                };
            }

            // Perform ping test
            const pingResult = await this.testConnection();
            
            if (!pingResult) {
                return { 
                    status: 'error', 
                    message: 'Database ping failed',
                    details: this.getConnectionStatus()
                };
            }

            return { 
                status: 'healthy', 
                message: 'Database connection is working',
                details: this.getConnectionStatus()
            };
        } catch (error) {
            return { 
                status: 'error', 
                message: 'Database health check failed',
                error: error.message,
                details: this.getConnectionStatus()
            };
        }
    }

    // Get database stats
    async getStats() {
        try {
            if (!this.isConnected) {
                return {
                    status: 'disconnected',
                    collections: [],
                    totalDocuments: 0
                };
            }

            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();
            
            const stats = {
                status: 'connected',
                collections: collections.map(c => c.name),
                totalCollections: collections.length,
                totalDocuments: 0
            };

            // Count documents in each collection
            for (const collection of collections) {
                try {
                    const count = await db.collection(collection.name).countDocuments();
                    stats.totalDocuments += count;
                } catch (error) {
                    console.warn(`Could not count documents in ${collection.name}:`, error.message);
                }
            }

            return stats;
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                collections: [],
                totalDocuments: 0
            };
        }
    }
}

// Export singleton instance
const database = new DatabaseManager();
module.exports = database;