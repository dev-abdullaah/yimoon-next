// types/storefront.ts

export interface StorefrontSection {
    id?: number | string;
    key: string;
    title?: string;
    subtitle?: string;
    is_active?: boolean;
    sort_order?: number;
    options?: Record<string, any>;
    [key: string]: any;
}

export interface StorefrontBanner {
    id?: number | string;
    title?: string;
    subtitle?: string;
    image?: string;
    image_mobile?: string;
    url?: string;
    target?: string;
    placement?: string;
    is_active?: boolean;
    [key: string]: any;
}

export interface HeroSlide {
    id: number | string;
    title?: string | null;
    subtitle?: string | null;
    image?: string | null;
    link_url?: string | null;
    button_text?: string | null;
    sort_order?: number;
    [key: string]: any;
}

export interface HeroTile {
    id: number | string;
    title?: string | null;
    subtitle?: string | null;
    image?: string | null;
    link_url?: string | null;
    badge?: string | null;
    [key: string]: any;
}

export interface MenuItem {
    id: number | string;
    title: string;
    url: string;
    open_new_tab?: boolean;
    sort_order?: number;
    children?: MenuItem[];
    [key: string]: any;
}

export interface StorefrontConfig {
    sections?: StorefrontSection[];
    banners?: Record<string, StorefrontBanner | StorefrontBanner[]>;
    settings?: Record<string, any>;
    menus?: {
        header?: MenuItem[];
        footer_col_1?: MenuItem[];
        footer_col_2?: MenuItem[];
        footer_col_3?: MenuItem[];
        [key: string]: MenuItem[] | undefined;
    };
    [key: string]: any;
}

export interface UseStorefrontReturn {
    data: StorefrontConfig | undefined;
    sections: StorefrontSection[];
    banners: Record<string, any>;
    settings: Record<string, any>;
    menus: Record<string, any>;
    sectionsByKey: Record<string, StorefrontSection>;
    isSectionActive: (key: string, defaultActive?: boolean) => boolean;
    getSection: (key: string) => StorefrontSection | null;
    getBanner: (placement: string) => any;
    getSetting: (key: string, fallback?: string) => string;
    getHeaderMenus: () => MenuItem[];
    getFooterMenus: (col?: number) => MenuItem[];
    isLoading: boolean;
    error: unknown;
}
