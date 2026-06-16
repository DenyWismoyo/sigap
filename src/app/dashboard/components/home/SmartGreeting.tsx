"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, CloudSun, Sunset } from 'lucide-react';

export default function SmartGreeting({ userName }: { userName: string }) {
  const [greetingData, setGreetingData] = useState({ 
    text: '', 
    subText: '', 
    icon: <Sun className="w-8 h-8 text-yellow-500" /> 
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      setGreetingData({
        text: "Selamat Pagi",
        subText: "Siap untuk memulai hari yang produktif?",
        icon: <CloudSun className="w-8 h-8 text-yellow-400" />
      });
    } else if (hour >= 11 && hour < 15) {
      setGreetingData({
        text: "Selamat Siang",
        subText: "Jangan lupa istirahat sejenak.",
        icon: <Sun className="w-8 h-8 text-orange-500" />
      });
    } else if (hour >= 15 && hour < 19) {
      setGreetingData({
        text: "Selamat Sore",
        subText: "Mari tuntaskan pekerjaan hari ini.",
        icon: <Sunset className="w-8 h-8 text-orange-400" />
      });
    } else {
      setGreetingData({
        text: "Selamat Malam",
        subText: "Terima kasih atas dedikasi Anda hari ini.",
        icon: <Moon className="w-8 h-8 text-indigo-400" />
      });
    }
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="flex flex-col md:flex-row md:items-center gap-4 mb-8 px-1 md:px-0"
    >
      <div className="p-3 bg-card rounded-full shadow-sm border border-border w-fit">
        {greetingData.icon}
      </div>
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {greetingData.text}, <span className="text-primary">{userName}</span>!
        </h1>
        <p className="text-muted-foreground mt-1">
          {greetingData.subText}
        </p>
      </div>
    </motion.div>
  );
};