import { useLocation } from 'react-router-dom'

function ClipEditor() {
  const location = useLocation()
  const youtubeUrl = location.state?.youtubeUrl

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Clip Editor</h1>
        <p className="text-gray-600 mb-4">This page will be implemented later.</p>
        {youtubeUrl && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-2 font-semibold">YouTube URL:</p>
            <p className="text-gray-600 break-all">{youtubeUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClipEditor;
