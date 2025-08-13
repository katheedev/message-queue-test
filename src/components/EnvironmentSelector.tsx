import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, Settings } from 'lucide-react';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { ENVIRONMENTS, Environment } from '@/types/environment';
import { cn } from '@/lib/utils';

interface EnvironmentSelectorProps {
  showActions?: boolean;
  compact?: boolean;
  onManageEnvironments?: () => void;
}

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({ 
  showActions = false, 
  compact = false,
  onManageEnvironments
}) => {
  const { 
    currentEnvironment, 
    setCurrentEnvironment, 
    loading, 
    error, 
    refreshEnvironmentData 
  } = useEnvironment();

  const currentEnvConfig = ENVIRONMENTS.find(env => env.name === currentEnvironment);

  const handleEnvironmentChange = (value: string) => {
    setCurrentEnvironment(value as Environment);
  };

  const handleRefresh = async () => {
    await refreshEnvironmentData();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select value={currentEnvironment} onValueChange={handleEnvironmentChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENVIRONMENTS.map((env) => (
              <SelectItem key={env.name} value={env.name}>
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", env.color)} />
                  {env.displayName}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {currentEnvConfig && (
          <Badge 
            variant="outline" 
            className={cn("text-xs", currentEnvConfig.color.replace('bg-', 'border-'))}
          >
            {currentEnvConfig.displayName}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Environment Selection</h3>
            {showActions && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
                {onManageEnvironments && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onManageEnvironments}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded border border-destructive bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="environment">Current Environment</label>
              <Select value={currentEnvironment} onValueChange={handleEnvironmentChange}>
                <SelectTrigger id="environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((env) => (
                    <SelectItem key={env.name} value={env.name}>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full", env.color)} />
                        <div>
                          <div className="font-medium">{env.displayName}</div>
                          <div className="text-xs text-muted-foreground">{env.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentEnvConfig && (
              <div className="flex items-center gap-2 p-3 rounded border bg-muted">
                <div className={cn("h-3 w-3 rounded-full", currentEnvConfig.color)} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{currentEnvConfig.displayName}</div>
                  <div className="text-xs text-muted-foreground">{currentEnvConfig.description}</div>
                </div>
                <Badge variant="outline">{currentEnvironment.toUpperCase()}</Badge>
              </div>
            )}

            {loading && (
              <div className="text-center py-4 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading environment data...</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnvironmentSelector;