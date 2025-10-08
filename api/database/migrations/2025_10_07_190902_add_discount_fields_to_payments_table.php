<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->integer('discount_applied')->nullable()->after('status'); // desconto total aplicado (pro-rata + créditos)
            $table->integer('prorated_old')->nullable()->after('discount_applied'); // valor pro-rata do plano antigo
            $table->integer('prorated_new')->nullable()->after('prorated_old'); // valor pro-rata do plano novo
            $table->integer('applied_credits')->nullable()->after('prorated_new'); // créditos aplicados do saldo
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['discount_applied', 'prorated_old', 'prorated_new', 'applied_credits']);
        });
    }
};
