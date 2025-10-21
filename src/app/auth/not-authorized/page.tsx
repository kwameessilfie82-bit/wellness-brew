export default function NotAuthorizedPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-2xl font-bold">Not authorized</h1>
        <p className="text-muted-foreground">
          This area is restricted to managers. If you need access, please contact your manager.
        </p>
      </div>
    </div>
  );
}


