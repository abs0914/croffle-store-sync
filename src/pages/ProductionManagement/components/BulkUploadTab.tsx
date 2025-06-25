import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Store } from '@/types';

export const BulkUploadTab = () => {
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const { toast } = useToast();

  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const binaryStr = e.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Process the data (skip header row)
        const header = data[0] as string[];
        const items = data.slice(1).map((row: any) => {
          const item: any = {};
          header.forEach((key, index) => {
            item[key] = row[index];
          });
          return item;
        });

        setUploadedData(items);
        toast({
          title: "Data uploaded!",
          description: "Check the console for the parsed data.",
        })
      };

      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "There was an error reading the file.",
        })
      };

      reader.readAsBinaryString(file);
    });
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Transform the data to match the Store interface
      return (data || []).map(store => ({
        ...store,
        location: store.address || `${store.city || ''}, ${store.country || ''}`.trim() || 'Unknown Location'
      })) as Store[];
    }
  });

  return (
    <div>
      <div {...getRootProps()} className="border-2 border-dashed rounded-md p-4 cursor-pointer bg-gray-50">
        <input {...getInputProps()} />
        <p className="text-gray-500">Drag 'n' drop some files here, or click to select files</p>
      </div>

      {uploadedData.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Parsed Data:</h3>
          <pre>{JSON.stringify(uploadedData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
