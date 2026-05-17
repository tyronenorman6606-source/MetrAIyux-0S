import { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadataKeywords = [
    "Skye MCP",
    "Production Ledger",
    "Cloudflare Pages",
    "Cloudflare Workers",
    "Browser Proof",
    "MetrAIyux",
    "Skye Design MCP",
    "Operator Notes",
    "Proof Receipts",
    "Next.js",
]

export const metadata: Metadata = {
    title: siteConfig.name,
    description: siteConfig.description,
    keywords: metadataKeywords,
    authors: [
        {
            name: "Gray London Skyes",
            url: siteConfig.url,
        },
    ],
    creator: "Gray London Skyes",
    openGraph: {
        type: "website",
        locale: "en_US",
        url: siteConfig.url,
        title: siteConfig.name,
        description: siteConfig.description,
        siteName: siteConfig.name,
    },
    twitter: {
        card: "summary_large_image",
        title: siteConfig.name,
        description: siteConfig.description,
        creator: "@graylondonskyes",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};
