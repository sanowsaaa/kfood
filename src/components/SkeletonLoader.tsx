interface SkeletonLoaderProps {
  type?: 'card' | 'text' | 'image' | 'button';
  count?: number;
  className?: string;
}

export default function SkeletonLoader({ 
  type = 'card', 
  count = 1,
  className = '' 
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 ${className}`}>
            <div className="skeleton h-72 bg-gray-200"></div>
            <div className="p-6">
              <div className="skeleton h-4 bg-gray-200 rounded mb-3 w-24"></div>
              <div className="skeleton h-6 bg-gray-200 rounded mb-2 w-full"></div>
              <div className="skeleton h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
              <div className="flex items-center justify-between pt-4">
                <div className="skeleton h-8 bg-gray-200 rounded w-24"></div>
                <div className="skeleton h-10 bg-gray-200 rounded w-28"></div>
              </div>
            </div>
          </div>
        );
      case 'text':
        return <div className={`skeleton h-4 bg-gray-200 rounded ${className}`}></div>;
      case 'image':
        return <div className={`skeleton bg-gray-200 ${className}`}></div>;
      case 'button':
        return <div className={`skeleton h-10 bg-gray-200 rounded-xl ${className}`}></div>;
      default:
        return null;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </>
  );
}
