import React from 'react';
import { bankInfo } from '../constants/bankInfo';

const Logo = ({ size = 'default', className = '' }) => {
    const sizes = {
        small: 'w-8 h-8',
        default: 'w-10 h-10',
        large: 'w-16 h-16',
    };

    const textSizes = {
        small: 'text-lg',
        default: 'text-xl',
        large: 'text-2xl',
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`${sizes[size]} bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg`}>
                <svg 
                    className="w-2/3 h-2/3 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                    />
                </svg>
            </div>
            
            <div className="flex flex-col">
                <span className={`font-bold text-gray-800 ${textSizes[size]}`}>
                    {bankInfo.shortName}
                </span>
                <span className="text-xs text-blue-600 hidden sm:block">{bankInfo.name}</span>
                <span className="text-xs text-gray-500 hidden sm:block">{bankInfo.tagline}</span>
            </div>
        </div>
    );
};

export default Logo;