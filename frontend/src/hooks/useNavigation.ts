import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export const useNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const isActivePath = useCallback((path: string) => {
    return pathname === path;
  }, [pathname]);

  return {
    navigateTo,
    isActivePath,
    currentPath: pathname
  };
};
