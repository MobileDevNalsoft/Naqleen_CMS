import { useContainersQuery } from '../../api';
import { useStore } from '../../store/store';

export default function ContainerList() {
    const layout = useStore((state) => state.layout);
    const { isLoading, error } = useContainersQuery(layout);
    const selectId = useStore((state) => state.selectId);
    const ids = useStore((state) => state.ids);
    const entities = useStore((state) => state.entities);

    if (isLoading) return <div className="p-4">Loading containers...</div>;
    if (error) return <div className="p-4 text-red-500">Error loading containers</div>;

    const selectedContainer = selectId ? entities[selectId] : null;

    return (
        <div className="absolute top-0 left-0 h-full w-80 bg-white/90 shadow-lg overflow-hidden flex flex-col z-10">
            <div className="p-4 border-b bg-gray-100">
                <h2 className="text-xl font-bold">Containers</h2>
                <p className="text-sm text-gray-600">Total: {ids.length}</p>
                {selectedContainer && (
                    <div className="mt-2 p-2 bg-blue-100 rounded text-sm">
                        <p className="font-semibold">Selected: {selectedContainer.id}</p>
                        <p>Status: {selectedContainer.status}</p>
                        <p>Pos: {selectedContainer.x.toFixed(1)}, {selectedContainer.y.toFixed(1)}, {selectedContainer.z.toFixed(1)}</p>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {ids.map((id) => {
                    const entity = entities[id];
                    const isSelected = selectId === id;
                    return (
                        <div
                            key={id}
                            className={`p-2 mb-1 rounded cursor-pointer text-sm ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                                }`}
                            onClick={() => useStore.getState().setSelectId(id)}
                        >
                            <div className="flex justify-between">
                                <span className="font-medium">{id}</span>
                                <span className={`text-xs px-1 rounded ${entity.status === 'active' ? 'bg-green-200 text-green-800' :
                                    entity.status === 'maintenance' ? 'bg-yellow-200 text-yellow-800' :
                                        'bg-gray-200 text-gray-800'
                                    }`}>
                                    {entity.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
