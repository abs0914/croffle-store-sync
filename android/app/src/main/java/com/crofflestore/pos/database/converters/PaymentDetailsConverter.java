package com.crofflestore.pos.database.converters;

import androidx.room.TypeConverter;
import com.google.gson.Gson;
import com.crofflestore.pos.database.entities.OfflineTransaction.PaymentDetails;

/**
 * Room Type Converter for PaymentDetails objects
 */
public class PaymentDetailsConverter {
    
    private static final Gson gson = new Gson();
    
    @TypeConverter
    public static PaymentDetails fromString(String value) {
        if (value == null) {
            return null;
        }
        return gson.fromJson(value, PaymentDetails.class);
    }
    
    @TypeConverter
    public static String fromPaymentDetails(PaymentDetails paymentDetails) {
        if (paymentDetails == null) {
            return null;
        }
        return gson.toJson(paymentDetails);
    }
}
