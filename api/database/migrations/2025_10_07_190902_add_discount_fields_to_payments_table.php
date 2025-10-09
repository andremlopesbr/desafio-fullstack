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
            $table->decimal('discount_applied', 13, 2)->nullable()->after('status'); // desconto total aplicado (pro-rata + créditos) EM REAIS
            $table->decimal('prorated_old', 13, 2)->nullable()->after('discount_applied'); // valor pro-rata do plano antigo EM REAIS
            $table->decimal('prorated_new', 13, 2)->nullable()->after('prorated_old'); // valor pro-rata do plano novo EM REAIS
            $table->decimal('applied_credits', 13, 2)->nullable()->after('prorated_new'); // créditos aplicados do saldo EM REAIS
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
