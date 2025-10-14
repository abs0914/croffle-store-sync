package com.crofflestore.pos.database.converters;

import androidx.room.TypeConverter;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.crofflestore.pos.database.entities.OfflineTransaction.TransactionItem;
import java.lang.reflect.Type;
import java.util.List;

/**
 * Room Type Converter for TransactionItem lists
 */
public class TransactionItemConverter {
    
    private static final Gson gson = new Gson();
    
    @TypeConverter
    public static List<TransactionItem> fromString(String value) {
        if (value == null) {
            return null;
        }
        Type listType = new TypeToken<List<TransactionItem>>(){}.getType();
        return gson.fromJson(value, listType);
    }
    
    @TypeConverter
    public static String fromTransactionItemList(List<TransactionItem> list) {
        if (list == null) {
            return null;
        }
        return gson.toJson(list);
    }
}
