import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/store';

class RealtimeService {
    private socket: Socket | null = null;
    private batch: any[] = [];
    private batchTimeout: any = null;
    private simulationInterval: any = null;

    connect(url: string) {
        if (this.socket) return;

        this.socket = io(url, {
            transports: ['websocket'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('Connected to realtime service');
        });

        this.socket.on('positions', (data: any[]) => {
            this.queueUpdates(data);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from realtime service');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.stopSimulation();
    }

    private queueUpdates(updates: any[]) {
        this.batch.push(...updates);

        if (!this.batchTimeout) {
            this.batchTimeout = setTimeout(() => {
                this.flushBatch();
            }, 50); // 50ms batching window
        }
    }

    private flushBatch() {
        if (this.batch.length > 0) {
            useStore.getState().patchPositions(this.batch);
            this.batch = [];
        }
        this.batchTimeout = null;
    }

    // Simulation for testing without a backend
    startSimulation() {
        if (this.simulationInterval) return;

        console.log('Starting simulation');
        this.simulationInterval = setInterval(() => {
            const ids = useStore.getState().ids;
            if (ids.length === 0) return;

            const updates = [];
            // Update 10% of entities
            const count = Math.max(1, Math.floor(ids.length * 0.1));

            for (let i = 0; i < count; i++) {
                const randomId = ids[Math.floor(Math.random() * ids.length)];
                const entity = useStore.getState().entities[randomId];
                if (entity) {
                    updates.push({
                        id: randomId,
                        x: entity.x + (Math.random() - 0.5) * 2,
                        y: entity.y + (Math.random() - 0.5) * 2,
                        z: entity.z + (Math.random() - 0.5) * 2,
                    });
                }
            }

            this.queueUpdates(updates);
        }, 100);
    }

    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
            console.log('Stopped simulation');
        }
    }
}

export const realtimeService = new RealtimeService();
