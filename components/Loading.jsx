// components/Loading.jsx
export default function Loading() {
    return (
        <div className="container mx-auto px-5 md:px-7 lg:px-12 py-10">
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-12 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}